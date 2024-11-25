import Navbar from "@/components/shared/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import pfp from "@/../assets/images/pfp.png";
import UsersTable from "@/components/users/UsersTable";
import EventsTable from "@/components/events/EventsTable";
import BetsTable from "@/components/bets/BetsTable";
import Admin from "@/components/admin/Admin";
import ConfirmUserTable from "@/components/confirmation/ConfirmUserTable";
import VerifyUser from "@/components/verify-user/VerifyUser";
import { useState } from "react";

function Dashboard() {
  const links = [
    "Users",
    "Events",
    "Bets",
    "Confirm User",
    "Verify User",
    "Admins",
  ];
  const [selected, setSelected] = useState("Users");

  return (
    <main className="h-[100%] w-[1540px]  mx-auto border-r-[1px]  border-l-[1px] border-[#27272A] font-poppins">
      &nbsp;
      <div className="h-[90%]  mt-[14px] border-[1px] p-6 pt-6 border-[#27272A]">
        <Navbar links={links} selected={selected} setSelected={setSelected} />
        <div className="h-[95%]  w-full mx-auto p-8 border-[1px] border-[#27272A] rounded-lg text-white">
          <div className="flex justify-between items-center mb-10">
            <div className="welcomebar">
              <h2 className="text-2xl font-semibold tracking-tighter">
                Welcome Admin
              </h2>
              <h4 className="text-md mt-2 tracking-wide text-slate-400">
                {["Verify User", "Confirm User"].includes(selected)
                  ? "\u200B"
                  : `Here's a list of ${selected}.`}
              </h4>
            </div>
            <Avatar>
              <AvatarImage src={pfp} alt="@shadcn" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
          <div id="filterbar" className="flex items-center">
            {selected === "Users" && <UsersTable />}
            {selected === "Events" && <EventsTable />}
            {selected === "Bets" && <BetsTable />}
            {selected === "Admins" && <Admin />}
            {selected === "Confirm User" && <ConfirmUserTable />}
            {selected === "Verify User" && <VerifyUser />}
          </div>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
