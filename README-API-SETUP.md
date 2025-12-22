# Google Gemini API Setup

To enable AI level and asset generation, you must configure the **Google Gemini API**.

## Prerequisites

1.  A Google account.
2.  Get a free API key from [Google AI Studio](https://aistudio.google.com/).

## Configuration

1.  Create or update the `.env.local` file in the `template-nextjs` folder:

```env
# Required: Your Google Gemini API Key
GEMINI_API_KEY=your-api-key-here
```

## Important Notes

*   **Security**: Never commit your `.env.local` file to git.
*   **Restart**: You must restart the dev server (`npm run dev`) after changing environment variables.
*   **Quota**: The free tier has generous limits, but check Google AI Studio for details if you encounter rate limits.
