export type SkillContext = {
  userId: string;
  context?: string;
};

export type SkillResponse = {
  message: string;
};

export function runHelloWorldSkill(input: SkillContext): SkillResponse {
  const suffix = input.context ? ` Context: ${input.context}` : "";
  return {
    message: `Hello ${input.userId}! This dummy skill is registered and working.${suffix}`
  };
}
