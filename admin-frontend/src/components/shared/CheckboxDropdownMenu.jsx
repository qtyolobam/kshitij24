import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export function CheckboxDropdownMenu({
  icon,
  text,
  openDropdown,
  setOpenDropdown,
  states,
  icons,
  selectedStates,
  setSelectedStates,
  className = "",
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(`[data-dropdown="${text}"]`)) {
        setShowDropdown(false);
        setOpenDropdown("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown, text, setOpenDropdown]);

  const handleCheckboxChange = (state) => {
    setSelectedStates((prev) => ({
      ...prev,
      [state]: !prev[state],
    }));
  };

  const isAnyFilterActive = Object.values(selectedStates).some(
    (value) => value
  );

  return (
    <div data-dropdown={text}>
      <Button
        className={className}
        variant="checkboxmenu"
        highlight={isAnyFilterActive}
        size="fsdf"
        onClick={() => {
          setOpenDropdown(text);
          if (openDropdown === text) {
            setShowDropdown(!showDropdown);
          } else {
            setShowDropdown(true);
          }
        }}
      >
        {icon}
        &nbsp; {text}
      </Button>
      <div
        className={`px-[1px] bg-[#09090B] absolute mt-2 border-[1px] border-[#27272A] rounded-lg z-10 
          transition-all duration-200 ease-out
          ${
            showDropdown && openDropdown === text
              ? "opacity-100 animate-in fade-in-0 zoom-in-75"
              : "opacity-0 invisible animate-out fade-out-0 zoom-out-75"
          }`}
      >
        {states.map((state, index) => (
          <div
            key={state}
            className="flex items-center space-x-2 gap-3 px-4 py-2 hover:bg-[#27272A] rounded-md"
          >
            <Checkbox
              id={state}
              className="w-4 h-4"
              checked={selectedStates[state] || false}
              onCheckedChange={() => handleCheckboxChange(state)}
            />
            {icons && icons[index]}
            <label
              htmlFor={state}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {state}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
