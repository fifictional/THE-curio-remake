# Instructions: Scrape OpenAI Model Documentation

## Objective
Navigate to OpenAI's model documentation, extract model information including modality support levels and API compatibility, then save the data to `docs/OpenAIModels.json`.

## Rules
In the following steps, you will hit a website that is protected by Cloudflare. When the Cloudflare pop up appears, programmatically click on the checkbox to prove that you are human.  You can't do this through the DOM, so you're going to have to take a snapshot of the page and look at the content to try and find the box, and then emulate a click in that area.

## Steps

### 1. Navigate to the Models Documentation Page
- Navigate to: https://platform.openai.com/docs/models
- Wait for the page to fully load
- Take a snapshot to verify the page loaded correctly

### 2. Locate the "All models" Section
- Search the page snapshot for a section titled "All models" or similar heading
- Identify the container element that holds the list of model links
- Extract all links within this section that point to individual model documentation pages
- Store these links in a list for processing

### 3. Initialize Data Collection Structure
- Create an empty array to store model data
- The final JSON structure should match the following format:
[
    {
        "id": "model-id",
        "name": "model",
        "modalities": {
            "text": "supported" | "not_supported",
            "vision": "supported" | "not_supported",
            "audio": "supported" | "not_supported",
            "function_calling": "supported" | "not_supported"
        },
        "apis": {
            "completions": true | false,
            "responses": true | false,
            "transcriptions": true | false
        }
    }
]

### 4. Process Each Model Page
For each model link found in step 2:

#### 4a. Navigate to Model Page
- Navigate directly to the URL
- Wait for the page to fully load
- Take a snapshot to verify content loaded

#### 4b. Extract Model ID
- Extract the model ID from the page (usually in the page title, heading, or URL)
- This should match the model identifier (e.g., "gpt-4o", "gpt-4o-mini")

#### 4c. Extract Modality Support Levels
- Look for a section or table that describes the model's capabilities
- Find information about support for the 4 modalities:
  - **Text**: Can the model process text input/output?
  - **Vision**: Can the model process images/visual input?
  - **Audio**: Can the model process audio input/output?
  - **Function Calling**: Does the model support function calling/tool use?
- Extract the support level for each modality (typically "supported" or "not_supported")
- If information is unclear, default to "not_supported"

#### 4d. Extract API Support
- Look for sections or tables describing which APIs the model works with
- Specifically check for mentions of:
  - **Completions API**: Look for references to `/v1/completions` or "Completions API"
  - **Responses API**: Look for references to `/v1/chat/completions` or "Chat Completions API" or "Responses API"
  - **Transcriptions API**: Look for references to `/v1/audio/transcriptions` or "Audio Transcriptions API"
- Set each API to `true` if supported, `false` if not mentioned or explicitly not supported
- Ignore other APIs (embeddings, images, etc.) - only focus on these three

#### 4e. Store Model Data
- Create an object with the extracted data:
  - `id`: model identifier
  - `object`: "model"
  - `modalities`: object with 4 modality support levels
  - `apis`: object with 3 API support booleans
- Add this object to the data collection array

#### 4f. Return to Models List
- Navigate back to the main models page (or use browser back button)
- Wait for page to reload before processing next model

### 5. Merge with Existing Data
- Read the existing `docs/OpenAIModels.json` file
- For models that already exist in the file:
  - Update/add `modalities` field
  - Update/add `apis` field
- For new models:
  - Add complete entry with all fields
- For missing models:
  - Remove the entry and all fields as this entry is likely deprecated

### 6. Write Output File
- Sort the data array by model ID alphabetically (optional, for consistency)
- Format the complete JSON structure
- Write the final JSON to `docs/OpenAIModels.json`
- Ensure proper JSON formatting with 2-space indentation

### 7. Verification
- Read back the written file to verify it's valid JSON
- Check that all expected models are present
- Verify that modalities and APIs fields are populated for each model

## Notes
- If a model page doesn't load or is inaccessible, skip it and continue with the next model
- If modality or API information is not clearly stated on a page, mark as "not_supported" or `false` respectively
- Be patient with page loads - some pages may take time to render fully
- If encountering rate limiting or errors, pause briefly between requests