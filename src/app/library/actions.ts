"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deletePaper(paperId: string, storagePath: string) {
    const supabase = await createClient();

    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
        .from("papers")
        .remove([storagePath]);

    if (storageError) {
        console.error("Error deleting from storage:", storageError);
        // We continue even if storage delete fails, to ensure DB is clean, 
        // OR we could return an error. Let's return error if it's critical.
    }

    // 2. Delete from database
    const { error: dbError } = await supabase
        .from("papers")
        .delete()
        .eq("id", paperId);

    if (dbError) {
        console.error("Error deleting from database:", dbError);
        return { success: false, error: dbError.message };
    }

    revalidatePath("/library");
    return { success: true };
}
