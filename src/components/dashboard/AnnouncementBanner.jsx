//src/components/dashboard/AnnouncementBanner.jsx/
//
// Fetches the live announcements once per dashboard load and routes each one to
// its display mode:
//   - "banner" (the default, and what every pre-existing announcement is):
//     the slim strip above the dashboard, on every tab.
//   - "modal": a full-screen overlay, for the ones that must not be missed.
//
// Announcements with no displayMode field are treated as banners, so everything
// posted before modals existed keeps behaving exactly as it did.
import { useEffect, useState, useCallback } from "react";
import { X, Megaphone, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import AnnouncementModal from "./AnnouncementModal";
import { safeAnnouncementUrl } from "../../utils/announcementLink";

const DISMISSED_KEY = "sellapage_dismissed_announcements";

const TYPE_STYLES = {
  info: {
    wrap: "bg-blue-50 border-blue-100 text-blue-700",
    cta: "bg-blue-600 hover:bg-blue-700",
    icon: Megaphone,
    iconCls: "text-blue-500",
  },
  warning: {
    wrap: "bg-amber-50 border-amber-100 text-amber-700",
    cta: "bg-amber-600 hover:bg-amber-700",
    icon: AlertTriangle,
    iconCls: "text-amber-500",
  },
  promo: {
    wrap: "bg-purple-50 border-purple-100 text-purple-700",
    cta: "bg-purple-600 hover:bg-purple-700",
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

  const dismiss = useCallback((id) => {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id]));
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const banners = announcements.filter((a) => a.displayMode !== "modal");
  // Only one overlay at a time. Stacking full-screen modals would trap the
  // vendor behind several dismissals before they reach their dashboard.
  const modal = announcements.find((a) => a.displayMode === "modal") || null;

  if (!banners.length && !modal) return null;

  return (
    <>
      {modal && (
        <AnnouncementModal
          announcement={modal}
          onDismiss={() => dismiss(modal.id)}
        />
      )}

      {banners.length > 0 && (
        <div className="w-full flex flex-col gap-2 px-3 sm:px-4 pt-3 flex-shrink-0">
          {banners.map((a) => {
            const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
            const Icon = style.icon;
            // Validated at render as well as on save: this read is public, and
            // documents predating URL validation are still in the collection.
            const href = safeAnnouncementUrl(a.ctaUrl);
            const label = (a.ctaLabel || "").trim() || "Learn More";

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
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors ${style.cta}`}
                    >
                      {label} <ArrowRight size={13} />
                    </a>
                  )}
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
      )}
    </>
  );
}
