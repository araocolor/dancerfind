export default function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  void params;
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">회원 프로필</h1>
      {/* TODO: 프로필 정보 */}
    </div>
  );
}
