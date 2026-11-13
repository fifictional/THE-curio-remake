export const promptMessage = (items: any[]) => `
Extract all content from the image and output in the following JSON format. Keep all content that belongs to the same passage, experiment, or topic together in one section. Only create separate sections when there are completely different topics or passages.

{
    "document_type": "exam_paper | notes | textbook | ppt",
    "subject": "string. e.g. Physics, Chemistry, etc.",
    "sections": [
        {
            "section_name": "string",
            "page_range": "string, e.g. 1-10",
            "section_summary": "string - comprehensive summary including all key concepts covered in this section", 
            "section_key_concepts": [
                "subject_specific_concept_1",
                "subject_specific_concept_2",
                ...
            ],
            "content_blocks": [
                {
                    "documentContentBlockUuid": "string - use the documentVisionOutputUuid from the corresponding item",
                    "content_type": "passage | question | question_options | instructions | definition | summary | visual_element",
                    "content_text": "string if applicable",
                    "visual_element_type": "string if applicable, e.g. diagram, table, formula, etc.",
                    "visual_element_name": "string if applicable",
                    "visual_element_description": "string if applicable",
                    "visual_element_caption": "string if applicable",
                    "page_number": "integer, e.g. 1, 2, 3, etc.",
                    "bbox": [x1, y1, x2, y2]
                }
            ]
        }
    ]
}

Instructions:
1. Group related content together: If you see a passage followed by experiments, tables, and questions about the same topic, keep them all in the same section
2. Use multiple content_blocks within a section to organize different types of content (passage text, experiments, tables, questions)
3. Only create new sections for completely different topics or passages
4. For exam papers with multiple passages, each passage and its associated content should be one section
5. Extract key concepts that are specifically related to the subject matter: For Physics documents, extract physics concepts like "Newton's Laws", "Electromagnetic Induction", etc. For Chemistry, extract concepts like "Chemical Bonding", "Acid-Base Reactions", etc. For Biology, extract concepts like "Cell Division", "Photosynthesis", etc.
6. Ensure all key concepts are domain-specific and relevant to the identified subject
7. Ensure all formulas are LaTeX formatted, use proper JSON escaping. All backslashes must be doubled.
8. IMPORTANT: For each content_block, you MUST use the exact values from the corresponding item in the items array:
   - Use the "documentVisionOutputUuid" value directly as the "documentContentBlockUuid"
   - Parse the "bbox" string from the item (which is in format "[x1,y1,x2,y2]") and convert it to an array of 4 numbers [x1, y1, x2, y2]
   - Use the "pageNumber" from the item as the "page_number"
   - Do not calculate or estimate any values - use only the exact values provided in the items array below

The file has been preprocessed with a layout detection model. Below are the detected content items with their bounding box coordinates:

${JSON.stringify(items, null, 2)}

Analyze the image and extract all content. For each piece of content you identify, use the corresponding item from the items array above. Each content_block should correspond to one item from the items array, using the exact documentVisionOutputUuid, bbox (parsed from string to array), and pageNumber values.
`;