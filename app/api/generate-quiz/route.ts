import { atsSchema } from "@/lib/schemas";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

async function withCors(
  request: Request,
  handler: (req: Request) => Promise<Response>
) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const response = await handler(request);
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) =>
    newHeaders.set(key, value)
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export async function OPTIONS(req: Request) {
  return withCors(req, async () => new Response(null, { status: 200 }));
}

export async function POST(req: Request) {
  return withCors(req, async (request) => {
    try {
      const { files, jobDetails } = await request.json();
      const resumePDF = files[0].data;

      const formattedJobPosting = `
Job Title: ${jobDetails.jobTitle}
Location: ${jobDetails.location}
Description: ${jobDetails.description}`;

      const result = streamObject({
        model: google("gemini-1.5-pro-latest"),
        messages: [
          {
            role: "system",
            content: `You are an ATS analyzer focused on providing concise, actionable feedback. Compare the resume to the job posting and provide scores and brief insights for key areas. Keep all analysis short and mobile-friendly - each section should be 1-2 sentences maximum. Focus on the most important matches and gaps.

Key points to analyze:
- Overall match and key takeaways
- Essential hard skills (technical skills, tools)
- Critical soft skills
- Experience level match
- Must-have qualifications
- Key missing keywords`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this resume against the following job posting:\n${formattedJobPosting}`,
              },
              {
                type: "file",
                data: resumePDF,
                mimeType: "application/pdf",
              },
            ],
          },
        ],
        schema: atsSchema,
        output: "object",
        onFinish: ({ object }) => {
          const res = atsSchema.safeParse(object);
          if (res.error) {
            throw new Error(res.error.errors.map((e) => e.message).join("\n"));
          }
        },
      });

      return result.toTextStreamResponse();
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal Server Error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  });
}
