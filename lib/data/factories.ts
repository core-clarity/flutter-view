import { type Scorecard } from "@/lib/schema";

/**
 * 未作成ステップをクリックした時に Workspace が自動生成する最小 Scorecard。
 */
export function createMinimalScorecard(id: string, label: string): Scorecard {
  return {
    id,
    label,
    date: "",
    format: "",
    interviewer: "",
    axisScores: {
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    },
    materials: [],
  };
}

/**
 * 新規 BPRタスク追加時の最小 Profile 生成ヘルパー。
 */
export function createMinimalProfile(name: string) {
  return {
    name,
    birthday: "",
    source: "",
    email: "",
    phone: "",
    address: "",
    recruiter: "",
    desiredSalaryMin: "",
    desiredSalaryMax: "",
    availableStartDate: "",
    careerText: "",
    motivationFull: "",
  };
}
