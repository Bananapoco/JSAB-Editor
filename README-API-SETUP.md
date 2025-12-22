# Vertex AI API Setup (Strict ADC Mode)

To enable AI level and asset generation, you must configure **Google Vertex AI** with Application Default Credentials (ADC). API keys are NOT supported.

## Prerequisites

1.  A Google Cloud Project with billing enabled.
2.  Enable the **Vertex AI API** in your Google Cloud Console.
3.  Create a **Service Account** with the "Vertex AI User" role.
4.  Download the Service Account key as a JSON file.

## Configuration

1.  Place your service account JSON file somewhere secure on your machine (e.g., inside this project folder, but make sure it is git-ignored!).
    *   Example: `template-nextjs/service-account-key.json`

2.  Create or update the `.env.local` file in the `template-nextjs` folder:

```env
# Required: Your Google Cloud Project ID
GOOGLE_CLOUD_PROJECT=your-project-id-here

# Required: The full absolute path to your service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your/service-account-key.json

# Optional: Region (defaults to us-central1)
GOOGLE_CLOUD_LOCATION=us-central1
```

## Important Notes

*   **Security**: Never commit your JSON key or `.env.local` file to git.
*   **Restart**: You must restart the dev server (`npm run dev`) after changing environment variables.
*   **Path**: Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to the actual file location. If the file is in the project root, you can use `service-account-key.json` (relative path usually works with Node.js, but absolute path is safer).
