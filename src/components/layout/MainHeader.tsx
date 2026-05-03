import SearchNavButton from "@/components/layout/SearchNavButton";
import HeaderBackCircleButton from "@/components/layout/HeaderBackCircleButton";

export default function MainHeader({ showBackButton = false }: { showBackButton?: boolean }) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] h-14 px-4 relative flex items-center">
      <div className="w-10 flex items-center justify-start">
        {showBackButton ? <HeaderBackCircleButton /> : null}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 font-bold text-xl text-[#FEE500] leading-none">
        MAIN
      </div>
      <div className="ml-auto w-10 flex items-center justify-end">
        <SearchNavButton isLoggedIn={false} />
      </div>
    </header>
  );
}
