import { questionSchema, questionsSchema } from "@/lib/schemas";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000", // Your local development server
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS(req: Request) {
  console.log("OPTIONS request received");
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export const maxDuration = 60;

export async function POST(req: Request) {
  console.log("POST request received");

  // Check the request method
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { files } = await req.json();
    const firstFile = files[0].data;

    const result = streamObject({
      model: google("gemini-1.5-pro-latest"),
      messages: [
        {
          role: "system",
          content:
            "You are a teacher. Your job is to take a document, and create a multiple choice test (with 4 questions) based on the content of the document. Each option should be roughly equal in length.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Create a multiple choice test based on this document.",
            },
            {
              type: "file",
              data: firstFile,
              mimeType: "application/pdf",
            },
          ],
        },
      ],
      schema: questionSchema,
      output: "array",
      onFinish: ({ object }) => {
        const res = questionsSchema.safeParse(object);
        if (res.error) {
          throw new Error(res.error.errors.map((e) => e.message).join("\n"));
        }
      },
    });

    const response = result.toTextStreamResponse();

    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}
