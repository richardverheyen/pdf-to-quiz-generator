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

interface JobDetails {
  jobTitle: string;
  location: string;
  description: string;
}

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
      const { files, jobDetails } = await request.json();
      const resumePDF = files[0].data;

      // Format job details into a structured job posting
      const formattedJobPosting = `
Job Title: ${jobDetails.jobTitle}
Location: ${jobDetails.location}

Job Description:
${jobDetails.description}
`;

      const result = streamObject({
        model: google("gemini-1.5-pro-latest"),
        messages: [
          {
            role: "system",
            content: `You are an expert ATS (Applicant Tracking System) analyzer. Your job is to analyze resumes against job descriptions and provide detailed feedback and scoring.

Key Instructions:
1. Analyze both the content and format of the resume
2. Compare the resume against the job requirements
3. Look for keyword matches and gaps
4. Consider both hard skills and soft skills
5. Evaluate experience levels and relevance
6. Check education requirements
7. Look for industry-specific terminology
8. Provide specific, actionable feedback
9. Be thorough but fair in scoring
10. Consider both exact and semantic matches for keywords`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this resume against the following job posting and provide a detailed ATS analysis. Job Posting:\n\n${formattedJobPosting}`,
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
