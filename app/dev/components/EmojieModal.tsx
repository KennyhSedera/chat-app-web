import EmojiPicker, { Theme } from "emoji-picker-react";
import React, { useEffect, useRef, useState } from "react";
import { RiEmojiStickerLine } from "react-icons/ri";

function EmojieModal({
  value,
  onClick,
  closable,
  isReaction = false
}: {
  value?: string;
  onClick: (e: string) => void;
  closable?: boolean
  isReaction?: boolean
}) {
  const [visible, setVisible] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [emojiVertical, setEmojiVertical] = useState<"top" | "bottom">("bottom");
  const [emojiHorizontal, setEmojiHorizontal] = useState<"left" | "right">("right");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setVisible(false);
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible]);

  const handleEmojiClick = (emoji: string) => {
    onClick(emoji);
    closable && setVisible(false);
  };

  const handleToggle = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    const container = target.closest(".scrollbar-theme");
    const containerRect = container?.getBoundingClientRect();

    if (containerRect) {

      const spaceBelow = containerRect.bottom - rect.bottom;
      const spaceAbove = rect.top - containerRect.top;

      const EMOJI_PICKER_HEIGHT = 450;

      if (
        spaceBelow < EMOJI_PICKER_HEIGHT &&
        spaceAbove > spaceBelow
      ) {
        setEmojiVertical("top");
      } else {
        setEmojiVertical("bottom");
      }

      const spaceRight = containerRect.right - rect.right;
      const spaceLeft = rect.left - containerRect.left;

      const EMOJI_PICKER_WIDTH = 350;

      if (
        spaceRight < EMOJI_PICKER_WIDTH &&
        spaceLeft > spaceRight
      ) {
        setEmojiHorizontal("left");
      } else {
        setEmojiHorizontal("right");
      }
    }

    setVisible((prev) => !prev);
  };

  return (
    <div ref={pickerRef} className="relative">
      <span
        onClick={handleToggle}
        className="cursor-pointer"
      >
        {value ? (
          value
        ) : (
          <RiEmojiStickerLine
            size={25}
            className="text-[#8B92A0] hover:text-[#3ECF8E] focus:text-[#3ECF8E]"
          />
        )}
      </span>

      {visible && (
        <div
          className={`absolute right-0 z-50 bottom-7 ${(isReaction && emojiVertical === "bottom")
            ? "top-6"
            : "bottom-2"
            } ${(isReaction && emojiHorizontal === "right")
              ? "left-0"
              : "right-0"
            }`}
        >
          <EmojiPicker
            onEmojiClick={(emojiObject) =>
              handleEmojiClick(emojiObject.emoji)
            }
            reactionsDefaultOpen={isReaction}
            theme={Theme.DARK}
          />
        </div>
      )}
    </div>
  );
}

export default EmojieModal;