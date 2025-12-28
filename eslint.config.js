const coreWebVitals = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...coreWebVitals,
  {
    files: ["src/components/pdf-v2/SmartPDFViewer.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];
