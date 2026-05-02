export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">회원 프로필</h1>
      {/* TODO: 닉네임, 사진, 자기소개, 활동지역, 모집중 클래스 목록 */}
    </div>
  );
}
