
export function useRequestInit(method: string, body: object | null = null, convertToJson = false) {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    credentials: 'include' // "include" | "omit" | "same-origin" - to get in response a cookie with token and set in the browser
  };

  if (body) {
    init['body'] = convertToJson
      ? JSON.stringify(body)
      : body as BodyInit
  }

  return init;
}
