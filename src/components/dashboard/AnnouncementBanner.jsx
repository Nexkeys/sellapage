//src/components/dashboard/AnnouncementBanner.jsx/
import { useEffect, useState } from "react";
import { X, Megaphone, AlertTriangle, Sparkles } from "lucide-react";

const DISMISSED_KEY = "sellapage_dismissed_announcements";

const TYPE_STYLES = {
  info: {
    wrap: "bg-blue-50 border-blue-100 text-blue-700",
    icon: Megaphone,
    iconCls: "text-blue-500",
  },
  warning: {
    wrap: "bg-amber-50 border-amber-100 text-amber-700",
    icon: AlertTriangle,
    iconCls: "text-amber-500",
  },
  promo: {
    wrap: "bg-purple-50 border-purple-100 text-purple-700",
    icon: Sparkles,
    iconCls: "text-purple-500",
  },
};

function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin-announcements?action=active")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((data) => {
        if (cancelled) return;
        const dismissed = getDismissed();
        setAnnouncements(
          (data.announcements || []).filter((a) => !dismissed.includes(a.id))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = (id) => {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id]));
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (!announcements.length) return null;

  return (
    <div className="w-full flex flex-col gap-2 px-3 sm:px-4 pt-3 flex-shrink-0">
      {announcements.map((a) => {
        const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-2.5 border rounded-xl px-3.5 py-3 ${style.wrap}`}
          >
            <Icon size={16} className={`flex-shrink-0 mt-0.5 ${style.iconCls}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">{a.title}</p>
              <p className="text-xs font-medium mt-0.5 leading-snug opacity-90">
                {a.message}
              </p>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="flex-shrink-0 -mr-1 -mt-1 p-1 rounded-full hover:bg-black/5"
              aria-label="Dismiss announcement"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
