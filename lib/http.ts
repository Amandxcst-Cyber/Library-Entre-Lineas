import { HttpError } from "./auth";
export async function readJson(
  request: Request,
  maxLength = 20000,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "Envía un formulario JSON válido.");
  if (Number(request.headers.get("content-length")) > maxLength)
    throw new HttpError(413, "El formulario es demasiado grande.");
  const body = await request.text();
  if (body.length > maxLength)
    throw new HttpError(413, "El formulario es demasiado grande.");
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(
      400,
      "El formulario no se pudo leer. Intenta de nuevo.",
    );
  }
}
