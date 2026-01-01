export const EMPTY_RESPONSE_ERROR = 'Momentum response was empty';

export function getAssistantMessage(response: any) {
  if (!response?.choices?.length) {
    throw new Error(EMPTY_RESPONSE_ERROR);
  }

  return response.choices[0]?.message;
}
