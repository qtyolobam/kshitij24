import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function DropdownMenu({
  icon,
  text,
  options,
  icons,
  className = "",
  user,
  onClickHandlers,
  setSelectedUser,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOption, setSelectedOption] = useState(() => {
    return options.reduce((acc, value) => {
      acc[value] = false;
      return acc;
    }, {});
  });

  return (
    <div>
      <Button
        className={className}
        variant="checkboxmenu"
        highlight={showDropdown}
        size="fsdf"
        onClick={() => {
          setShowDropdown(!showDropdown);
        }}
        onBlur={() => {
          setShowDropdown(false);
        }}
      >
        {icon}
      </Button>
      <div
        className={`px-[1px] bg-[#09090B] absolute mt-2 border-[1px] border-[#27272A] rounded-lg z-10 
          transition-all duration-200 ease-out
          ${
            showDropdown
              ? "opacity-100 animate-in fade-in-0 zoom-in-75"
              : "opacity-0 invisible animate-out fade-out-0 zoom-out-75"
          }`}
      >
        {options.map((option, index) => {
          return (
            <div
              key={option}
              className="flex items-center space-x-2 gap-3 px-4 py-2 hover:bg-[#27272A] rounded-md"
              onClick={() => {
                setSelectedOption((prev) => ({
                  ...prev,
                  [option]: !prev[option],
                }));
                onClickHandlers[index]();
                setSelectedUser(user);
              }}
            >
              {icons && icons[index]}
              <label
                htmlFor={option}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
