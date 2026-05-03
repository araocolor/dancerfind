export const REGIONS = [
  "서울",
  "경기도",
  "부산",
  "대구",
  "대전",
  "광주",
  "창원",
  "전주",
  "제주",
] as const;

export type Region = (typeof REGIONS)[number];

export const REGIONS_WITH_ALL = ["전체", ...REGIONS] as const;

export const GENRES = [
  { value: "salsa", label: "살사" },
  { value: "bachata", label: "바차타" },
  { value: "festival", label: "페스티벌" },
  { value: "event", label: "이벤트" },
  { value: "other", label: "기타" },
] as const;

export const LEVELS = [
  { value: "beginner", label: "입문" },
  { value: "elementary", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "고급" },
  { value: "all", label: "올레벨" },
] as const;

export const CLASS_STATUSES = [
  { value: "recruiting", label: "모집중" },
  { value: "closed", label: "마감" },
  { value: "cancelled", label: "취소" },
] as const;

export const CLASS_TYPES = [
  { value: "group", label: "그룹" },
  { value: "private", label: "1:1" },
] as const;
