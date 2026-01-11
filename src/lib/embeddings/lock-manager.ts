/**
 * Lock manager pour éviter la génération d'embeddings en parallèle pour un même paper
 * Version simplifiée: utilise embedding_status comme lock (processing = en cours)
 * AVEC TIMEOUT pour éviter les locks bloqués indéfiniment
 */

import { createClient } from "@/lib/supabase/server";

const LOCK_TIMEOUT_MINUTES = 30;

/**
 * Vérifie si un lock est expiré (en cours depuis trop longtemps)
 * @param paperId - ID du paper
 * @returns true si lock doit être reseté
 */
export async function isLockExpired(paperId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data: paper } = await supabase
      .from("papers")
      .select("embedding_status, created_at, updated_at")
      .eq("id", paperId)
      .maybeSingle();

    if (!paper) return false;

    // Si statut est "processing", vérifier depuis combien de temps
    if (paper.embedding_status === "processing") {
      const processingTime = new Date(paper.updated_at || paper.created_at).getTime();
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - processingTime) / (1000 * 60);

      const isExpired = elapsedMinutes > LOCK_TIMEOUT_MINUTES;
      if (isExpired) {
        console.log(
          `[LOCK] ⚠️  Lock expired for paper ${paperId} (${elapsedMinutes.toFixed(1)}min > ${LOCK_TIMEOUT_MINUTES}min), resetting to error`
        );
      }

      return isExpired;
    }

    return false;
  } catch (error) {
    console.error(`[LOCK] Failed to check lock expiration for paper ${paperId}:`, error);
    return false;
  }
}

/**
 * Reset un lock expiré ou corrompu
 * @param paperId - ID du paper
 */
export async function resetExpiredLock(paperId: string): Promise<void> {
  const supabase = await createClient();

  try {
    await supabase
      .from("papers")
      .update({ embedding_status: "error" })
      .eq("id", paperId);

    console.log(`[LOCK] Reset expired lock for paper ${paperId} to error status`);
  } catch (error) {
    console.error(`[LOCK] Failed to reset lock for paper ${paperId}:`, error);
  }
}

/**
 * Tente d'acquérir un lock pour un paper
 * @param paperId - ID du paper
 * @returns true si lock acquéri, false si déjà en cours
 */
export async function acquireLock(paperId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Vérifier si le lock actuel est expiré avant d'acquérir un nouveau
    const lockExpired = await isLockExpired(paperId);
    if (lockExpired) {
      await resetExpiredLock(paperId);
    // Attendre un petit instant que le reset soit effectif
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Marquer le paper comme "processing" = lock
    const { data: paper, error } = await supabase
      .from("papers")
      .update({ embedding_status: "processing" })
      .eq("id", paperId)
      .select("embedding_status")
      .maybeSingle();

    // Si erreur PGRST116 = pas de ligne modifiée (déjà "processing")
    if (error) {
      if (error.code === "PGRST116") {
        // Déjà "processing" = lock existe
        // Vérifier si expiré pour permettre un retry
        const expired = await isLockExpired(paperId);
        if (expired) {
          console.log(`[LOCK] Resetting expired lock for paper ${paperId}`);
          await resetExpiredLock(paperId);
          // Retenter après reset
          const { data: retryPaper } = await supabase
            .from("papers")
            .update({ embedding_status: "processing" })
            .eq("id", paperId)
            .select("embedding_status")
            .maybeSingle();

          const wasProcessingNow = retryPaper?.embedding_status === "processing";
          if (!wasProcessingNow) {
            console.log(`[LOCK] ✅ Acquired lock after reset for paper ${paperId}`);
            return true;
          }
        }

        console.log(`[LOCK] Paper ${paperId} is already locked (status already processing)`);
        return false;
      }
      throw error;
    }

    // Si le statut actuel n'était pas "processing", on a acquéri le lock
    const wasProcessing = paper?.embedding_status === "processing";
    if (!wasProcessing) {
      console.log(`[LOCK] ✅ Acquired lock for paper ${paperId} (status changed to processing)`);
      return true;
    }

    // Déjà "processing" = lock déjà existe
    console.log(`[LOCK] Paper ${paperId} is already locked (status already processing)`);
    return false;
  } catch (error) {
    console.error(`[LOCK] ❌ Failed to acquire lock for paper ${paperId}:`, error);
    throw error;
  }
}

/**
 * Libère un lock pour un paper
 * @param paperId - ID du paper
 * @param status - Nouveau statut (complete/partial/error)
 */
export async function releaseLock(paperId: string, status: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("papers")
      .update({ embedding_status: status })
      .eq("id", paperId);

    if (error) {
      console.error(`[LOCK] Failed to release lock for paper ${paperId}:`, error);
    } else {
      console.log(`[LOCK] Released lock for paper ${paperId} (status: ${status})`);
    }
  } catch (error) {
    console.error(`[LOCK] Error releasing lock for paper ${paperId}:`, error);
  }
}

/**
 * Vérifie si un paper est actuellement en cours de génération
 * @param paperId - ID du paper
 * @returns true si locké (en cours)
 */
export async function isLocked(paperId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data: paper, error } = await supabase
      .from("papers")
      .select("embedding_status")
      .eq("id", paperId)
      .maybeSingle();

    if (error || !paper) {
      console.error(`[LOCK] Failed to check lock for paper ${paperId}:`, error);
      return false;
    }

    const locked = paper.embedding_status === "processing";
    if (locked) {
      console.log(`[LOCK] Paper ${paperId} is currently locked (status: processing)`);
    }

    return locked;
  } catch (error) {
    console.error(`[LOCK] Error checking lock for paper ${paperId}:`, error);
    return false;
  }
}

/**
 * Wrapper avec auto-release pour garantir le nettoyage du lock
 * @param paperId - ID du paper
 * @param finalStatus - Statut final (complete/partial/error)
 * @param operation - Fonction à exécuter avec le lock
 * @returns Résultat de l'opération
 */
export async function withLock<T>(
  paperId: string,
  finalStatus: string,
  operation: () => Promise<T>
): Promise<T> {
  const acquired = await acquireLock(paperId);

  if (!acquired) {
    throw new Error(
      `Embedding generation already in progress for paper ${paperId}. Please wait.`
    );
  }

  try {
    return await operation();
  } finally {
    await releaseLock(paperId, finalStatus);
  }
}
