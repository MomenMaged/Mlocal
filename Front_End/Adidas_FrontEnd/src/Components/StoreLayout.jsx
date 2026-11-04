import { Outlet } from "react-router-dom";
import Navbar from "./NavBar";
import Footer from "./Footer";

export default function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
