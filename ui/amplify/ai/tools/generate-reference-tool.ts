import { FunctionTool } from "@ai-tools/types";

export const generateReferenceTool: FunctionTool = {
  type: "function",
  name: "generateReference",
  description: "Generate a reference (passage, graph, chart, table, or diagram) based on the provided prompt. IMPORTANT: For visual references (graph/chart/diagram/image), you MUST execute Python code using code_interpreter FIRST to generate the image file, then you can optionally call this tool. For text references (passage/table), call this tool directly with the content.",
  parameters: {
    referenceType: {
      type: "string",
      enum: ["passage", "graph", "chart", "table", "diagram", "image"],
      description: "The type of reference being generated"
    },
    content: {
      type: "string",
      description: "For passages: the full text with markdown formatting. For tables: markdown table. Required for passage and table types. Not used for visual references (graph/chart/diagram/image)."
    },
    graphData: {
      type: "object",
      description: "Optional metadata for graphs and charts. Only include if you want to provide structured data. Not required - code_interpreter execution is what matters for visual references.",
      properties: {
        title: {
          type: "string",
          description: "Title of the graph/chart"
        },
        xAxisLabel: {
          type: "string",
          description: "Label for the x-axis"
        },
        yAxisLabel: {
          type: "string",
          description: "Label for the y-axis"
        },
        dataPoints: {
          type: "array",
          description: "Array of data points to plot",
          items: {
            type: "object",
            properties: {
              x: {
                type: "number",
                description: "X coordinate"
              },
              y: {
                type: "number",
                description: "Y coordinate"
              }
            }
          }
        },
        graphType: {
          type: "string",
          enum: ["line", "bar", "scatter", "pie"],
          description: "Type of graph to create"
        }
      }
    }
  }
};


