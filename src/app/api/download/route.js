import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const fileData = formData.get('fileData');
    const filename = formData.get('filename');
    const mimeType = formData.get('mimeType');

    if (!fileData || !filename || !mimeType) {
      return new Response("Missing required fields: fileData, filename, mimeType", { status: 400 });
    }

    // Extract base64 data and convert to buffer
    const base64Content = fileData.split(';base64,').pop();
    const buffer = Buffer.from(base64Content, 'base64');

    // Set headers to trigger a standard browser file download with filename
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return response;
  } catch (error) {
    console.error("Server download wrapper error:", error);
    return new Response("Internal Server Error during download", { status: 500 });
  }
}
