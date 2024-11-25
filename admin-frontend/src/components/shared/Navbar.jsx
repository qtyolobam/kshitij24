import { Button } from "@/components/ui/button";
import { useState } from "react";

function Navbar({ links, selected, setSelected }) {
  return (
    <nav className="mb-4">
      <ul className="flex">
        {links.map((link) => (
          <li key={Math.random()} className="mr-2">
            <Button
              onClick={() => setSelected(link)}
              size="dsfsdf"
              variant="navlink"
              highlight={selected === link ? true : false}
            >
              {link}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;
