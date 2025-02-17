import { questionSchema, questionsSchema } from "@/lib/schemas";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Middleware to add CORS headers to all responses
async function withCors(
  request: Request,
  handler: (req: Request) => Promise<Response>
) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const response = await handler(request);

  // Clone the response and add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export async function OPTIONS(req: Request) {
  return withCors(req, async () => {
    return new Response(null, { status: 200 });
  });
}

export async function POST(req: Request) {
  return withCors(req, async (request) => {
    try {
      const { files } = await request.json();
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

      return result.toTextStreamResponse();
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal Server Error" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  });
}
