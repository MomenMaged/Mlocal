import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./NavBar";
import Footer from "./Footer";
import ChatWidget from "./ChatWidget";

export default function StoreLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {/* key = pathname: React re-mounts this wrapper on every page change,
          which replays the .page-enter animation (fade up + un-blur). */}
      <div key={location.pathname} className="page-enter min-w-0 flex-1">
        <Outlet />
      </div>
      <Footer />
      <ChatWidget />
    </div>
  );
}
