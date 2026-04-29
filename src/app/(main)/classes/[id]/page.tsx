export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">클래스 상세</h1>
      {/* TODO: 클래스 정보, 신청 버튼 */}
    </div>
  );
}
