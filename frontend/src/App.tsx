import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  LayoutDashboard,
  MapPin,
  Menu,
  Plus,
  Search,
  Shield,
  Ticket,
  Trash2,
  X,
  Bell,
  Users,
  Edit3,
  Filter,
  CalendarCheck2,
  Sparkles,
} from "lucide-react";
import { api } from "./services/api";
import AdminLogin from "./components/AdminLogin";
import AdminRoute from "./components/AdminRoute";
import RegistrationFlow from "./components/RegistrationFlow";
import type { Event, Notice, Registration } from "./types";
const STUDENT_NAME = "Campus guest";
const fmt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
function useData() {
  const [events, setEvents] = useState<Event[]>([]),
    [notices, setNotices] = useState<Notice[]>([]),
    [regs, setRegs] = useState<Registration[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const refresh = async () => {
    try {
      setError("");
      const [e, n, r] = await Promise.all([
        api.events(),
        api.notices(),
        api.registrations(),
      ]);
      setEvents(e);
      setNotices(n);
      setRegs(r);
    } catch (x) {
      setError(
        x instanceof Error ? x.message : "Unable to reach CampusConnect API",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  return { events, notices, regs, error, busy, refresh, setError };
}
function App() {
  const data = useData(),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState("");
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 3200);
  };
  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <b>
              campus<span>connect</span>
            </b>
            <small>STUDENT PORTAL</small>
          </div>
          <button className="mobile-close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="profile">
          <div className="avatar">S</div>
          <div>
            <b>{STUDENT_NAME}</b>
            <small>Browser-scoped identity</small>
          </div>
          <ChevronDown size={16} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav onClick={() => setMobile(false)}>
          <NavItem to="/" icon={<LayoutDashboard />} label="Overview" />
          <NavItem to="/events" icon={<Compass />} label="Explore events" />
          <NavItem
            to="/registrations"
            icon={<Ticket />}
            label="My registrations"
            count={data.regs.length}
          />
          <NavItem to="/notices" icon={<Bell />} label="Notice board" />
          <div className="nav-caption admin-cap">MANAGEMENT</div>
          <NavItem to="/admin" icon={<Shield />} label="Admin panel" />
        </nav>
        <div className="sidebar-bottom">
          <div className="online">
            <i />
            All systems operational
          </div>
          <small>
            CampusConnect <span>v1.0</span>
          </small>
        </div>
      </aside>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="hamb" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="crumb">
            Student portal <span>/</span> <b>Campus life</b>
          </div>
          <div className="top-actions">
            <span className="term">
              <span /> FALL SEMESTER 2026
            </span>
            <button className="icon-btn" title="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <div className="top-avatar">S</div>
          </div>
        </header>
        {data.error && (
          <div className="error-banner">
            {data.error}
            <button onClick={data.refresh}>Retry</button>
          </div>
        )}
        <div className="page">
          <Routes>
            <Route path="/" element={<Dashboard {...data} />} />
            <Route
              path="/events"
              element={<EventsPage {...data} notify={notify} />}
            />
            <Route
              path="/events/:id"
              element={<EventDetail {...data} notify={notify} />}
            />
            <Route
              path="/registrations"
              element={<RegistrationsPage {...data} notify={notify} />}
            />
            <Route path="/notices" element={<NoticesPage {...data} />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  {(email) => (
                    <AdminPage {...data} notify={notify} adminEmail={email} />
                  )}
                </AdminRoute>
              }
            />
            <Route path="*" element={<Dashboard {...data} />} />
          </Routes>
        </div>
        <footer>
          © 2026 CampusConnect <span>Made for campus life</span>
        </footer>
      </main>
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function NavItem({
  to,
  icon,
  label,
  count,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
    >
      {icon}
      <span>{label}</span>
      {count ? <em>{count}</em> : null}
    </NavLink>
  );
}
function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function Dashboard({
  events,
  notices,
  regs,
  busy,
}: {
  events: Event[];
  notices: Notice[];
  regs: Registration[];
  busy: boolean;
}) {
  const navigate = useNavigate();
  const upcoming = events.filter(
    (e) => e.eventDate >= new Date().toISOString().slice(0, 10),
  );
  const featured = upcoming[0];
  const statCards = [
    {
      name: "Available events",
      n: upcoming.length,
      sub: "Across campus",
      icon: <CalendarDays />,
      tone: "violet",
      trend: "This semester",
    },
    {
      name: "Your registrations",
      n: regs.length,
      sub: "Events you’re attending",
      icon: <Ticket />,
      tone: "blue",
      trend: "View schedule",
    },
    {
      name: "Seats reserved",
      n: regs.length,
      sub: "Your campus moments",
      icon: <Users />,
      tone: "mint",
      trend: "Stay involved",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={new Date()
          .toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
          .toUpperCase()}
        title="Good morning, Student"
        subtitle="Your campus is full of things worth showing up for."
        action={
          <button className="btn primary" onClick={() => navigate("/events")}>
            <Compass size={17} /> Explore events <ArrowRight size={16} />
          </button>
        }
      />
      <section className="welcome">
        <div className="welcome-copy">
          <span className="pill-light">
            <span /> YOUR CAMPUS, IN MOTION
          </span>
          <h2>
            Make room for
            <br />
            something <i>memorable.</i>
          </h2>
          <p>
            From hands-on workshops to nights you’ll talk about all year — find
            your next campus moment.
          </p>
          <button className="btn white" onClick={() => navigate("/events")}>
            Find your next event <ArrowRight size={16} />
          </button>
        </div>
        <div className="welcome-art">
          <div className="orbit orbit1" />
          <div className="orbit orbit2" />
          <div className="art-sun" />
          <div className="art-glass">
            <CalendarDays size={42} />
          </div>
          <div className="float-tag">
            <span>✦</span> Good things happen here
          </div>
          <div className="art-dot dot1" />
          <div className="art-dot dot2" />
        </div>
        <div className="welcome-index">
          01 <span>/ 04</span>
        </div>
      </section>
      <div className="stats">
        {statCards.map((s, i) => (
          <div className="stat" key={s.name}>
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-content">
              <small>{s.name}</small>
              <strong>{busy ? "—" : String(s.n).padStart(2, "0")}</strong>
              <span>
                {i === 0 ? (
                  <>
                    <ArrowUpRight size={13} /> {s.trend}
                  </>
                ) : (
                  s.sub
                )}
              </span>
            </div>
            <ArrowDownRight className="stat-arrow" size={16} />
          </div>
        ))}
      </div>
      <div className="section-line">
        <div>
          <div className="eyebrow">A LITTLE INSPIRATION</div>
          <h2>
            On the horizon <span>✦</span>
          </h2>
        </div>
        <button className="text-btn" onClick={() => navigate("/events")}>
          See all events <ArrowRight size={15} />
        </button>
      </div>
      <div className="feature-grid">
        {featured ? (
          <div
            className="feature-card"
            onClick={() => navigate(`/events/${featured.id}`)}
          >
            <img
              src={featured.imageUrl}
              onError={(e) =>
                (e.currentTarget.src =
                  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1100&q=80")
              }
            />
            <div className="feature-overlay" />
            <span className="feature-kicker">✦ FEATURED EVENT</span>
            <div className="feature-content">
              <span className="category-tag">{featured.category}</span>
              <h3>{featured.title}</h3>
              <p>
                <CalendarDays size={15} /> {fmt(featured.eventDate)} <span />{" "}
                <MapPin size={15} /> {featured.venue}
              </p>
              <button className="round-arrow">
                <ArrowRight />
              </button>
            </div>
          </div>
        ) : (
          <Empty
            title="No upcoming events yet"
            message="Check back soon for new campus events."
          />
        )}
        <div className="side-events">
          <div className="mini-head">
            <div>
              <div className="eyebrow">DON’T MISS OUT</div>
              <h3>Coming up</h3>
            </div>
            <CalendarCheck2 size={19} />
          </div>
          {upcoming.slice(1, 4).map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onClick={() => navigate(`/events/${e.id}`)}
            />
          ))}
          {upcoming.length <= 1 && (
            <p className="muted">More events will appear here.</p>
          )}
          <button className="side-link" onClick={() => navigate("/events")}>
            Browse the calendar <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="bottom-grid">
        <div className="panel recent">
          <div className="panel-head">
            <div>
              <div className="eyebrow">STAY IN THE LOOP</div>
              <h3>Latest notices</h3>
            </div>
            <button
              className="icon-btn pale"
              onClick={() => navigate("/notices")}
            >
              <ArrowRight size={17} />
            </button>
          </div>
          {notices.slice(0, 3).map((n) => (
            <div className="notice-row" key={n.id}>
              <div className="notice-mark">
                <Bell size={15} />
              </div>
              <div>
                <b>{n.title}</b>
                <small>
                  {fmt(n.publishedAt)} · {n.category}
                </small>
              </div>
              {n.priority === "Important" && (
                <span className="important">IMPORTANT</span>
              )}
            </div>
          ))}
        </div>
        <div className="panel nudge">
          <div className="nudge-mark">
            <Sparkles size={21} />
          </div>
          <div className="eyebrow">A CAMPUS TIP</div>
          <h3>Say yes to something new.</h3>
          <p>
            Every event is a chance to meet your people, learn a skill, or
            stumble into a great story.
          </p>
          <button className="text-btn" onClick={() => navigate("/events")}>
            Find your thing <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
function EventRow({
  event: e,
  onClick,
}: {
  event: Event;
  onClick: () => void;
}) {
  return (
    <button className="event-row" onClick={onClick}>
      <div className="date-block">
        <b>{new Date(`${e.eventDate}T12:00:00`).getDate()}</b>
        <small>
          {new Date(`${e.eventDate}T12:00:00`)
            .toLocaleDateString("en-US", { month: "short" })
            .toUpperCase()}
        </small>
      </div>
      <div className="event-row-main">
        <b>{e.title}</b>
        <small>
          <Clock3 size={12} /> {e.eventTime} <span>·</span> {e.category}
        </small>
      </div>
      <ArrowRight size={16} />
    </button>
  );
}
function Empty({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <CalendarDays />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
function EventsPage(d: any) {
  const [q, setQ] = useState(""),
    [cat, setCat] = useState("All"),
    [selected, setSelected] = useState<Event | null>(null);
  const navigate = useNavigate();
  const events: Event[] = d.events;
  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (cat === "All" || e.category.toLowerCase() === cat.toLowerCase()) &&
          (!q ||
            `${e.title} ${e.description} ${e.venue}`
              .toLowerCase()
              .includes(q.toLowerCase())),
      ),
    [events, cat, q],
  );
  return (
    <>
      <PageHeading
        eyebrow="FIND YOUR NEXT MOMENT"
        title="Explore events"
        subtitle="A good day on campus starts with a plan."
      />
      <div className="filter-box">
        <div className="search-wrap">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, venues, or ideas..."
          />
          <kbd>⌘ K</kbd>
        </div>
        <div className="filter-label">
          <Filter size={15} /> FILTER BY
        </div>
        <div className="chips">
          {[
            "All",
            "Technical",
            "Cultural",
            "Sports",
            "Workshop",
            "Seminar",
          ].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`chip ${cat === c ? "selected" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
        {(q || cat !== "All") && (
          <button
            className="clear-btn"
            onClick={() => {
              setQ("");
              setCat("All");
            }}
          >
            Clear filters <X size={13} />
          </button>
        )}
      </div>
      <div className="results-line">
        <span>
          <b>{filtered.length}</b> events to explore
        </span>
        <span>
          Sorted by date <ChevronDown size={14} />
        </span>
      </div>
      {filtered.length ? (
        <div className="event-grid">
          {filtered.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              regs={d.regs}
              navigate={navigate}
              register={() => setSelected(e)}
            />
          ))}
        </div>
      ) : (
        <Empty
          title="Nothing on the calendar"
          message="Try a different search or clear your filters."
          action={
            <button
              className="btn secondary"
              onClick={() => {
                setQ("");
                setCat("All");
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
      {selected && (
        <RegistrationFlow
          event={selected}
          close={() => setSelected(null)}
          onSuccess={d.refresh}
        />
      )}
    </>
  );
}
function EventCard({
  event: e,
  regs,
  navigate,
  register,
}: {
  event: Event;
  regs: Registration[];
  navigate?: (s: string) => void;
  register: () => void;
}) {
  const registered = regs.some((r) => r.event.id === e.id),
    full = e.capacity > 0 && e.registered >= e.capacity;
  return (
    <article className="event-card">
      <div
        className="event-cover"
        onClick={() => navigate?.(`/events/${e.id}`)}
      >
        <img
          src={e.imageUrl}
          onError={(x) =>
            (x.currentTarget.src =
              "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1100&q=80")
          }
        />
        <span className="category-tag">{e.category}</span>
        <button
          className="save-dot"
          aria-label="View details"
          onClick={() => navigate?.(`/events/${e.id}`)}
        >
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="event-body">
        <div className="event-meta">
          <span>
            <CalendarDays size={14} />
            {fmt(e.eventDate)}
          </span>
          <span>
            <Clock3 size={14} />
            {e.eventTime}
          </span>
        </div>
        <h3 onClick={() => navigate?.(`/events/${e.id}`)}>{e.title}</h3>
        <p>{e.description}</p>
        <div className="venue">
          <MapPin size={14} />
          {e.venue}
        </div>
        <div className="event-card-foot">
          <span className={full ? "sold-out" : ""}>
            {full
              ? "Fully booked"
              : e.capacity
                ? `${Math.max(0, e.capacity - e.registered)} seats left`
                : "Open registration"}
          </span>
          <button
            disabled={registered || full}
            className={`btn ${registered ? "registered" : "small-primary"}`}
            onClick={register}
          >
            {registered ? (
              <>
                <Check size={15} /> Registered
              </>
            ) : full ? (
              "Full"
            ) : (
              "Register"
            )}
            {!registered && !full && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </article>
  );
}
function EventDetail(d: any) {
  const { id } = useParams(),
    e: Event | undefined = d.events.find((x: Event) => String(x.id) === id);
  const navigate = useNavigate(),
    [selected, setSelected] = useState(false);
  if (!e)
    return (
      <Empty
        title="Event not found"
        message="This event may have been removed."
        action={
          <button className="btn primary" onClick={() => navigate("/events")}>
            Back to events
          </button>
        }
      />
    );
  const registered = d.regs.some((r: Registration) => r.event.id === e.id),
    full = e.capacity > 0 && e.registered >= e.capacity;
  return (
    <>
      <button className="back-link" onClick={() => navigate("/events")}>
        ← All events
      </button>
      <div className="detail-hero">
        <img src={e.imageUrl} />
        <div className="feature-overlay" />
        <div className="detail-title">
          <span className="category-tag">{e.category}</span>
          <h1>{e.title}</h1>
          <div>
            <span>
              <CalendarDays size={15} /> {fmt(e.eventDate)} at {e.eventTime}
            </span>
            <span>
              <MapPin size={15} /> {e.venue}
            </span>
          </div>
        </div>
      </div>
      <div className="detail-grid">
        <div className="panel detail-copy">
          <div className="eyebrow">ABOUT THIS EVENT</div>
          <h2>Here’s what’s happening</h2>
          <p>{e.description}</p>
          <p>
            Bring your curiosity and meet the campus community. We can’t wait to
            see you there.
          </p>
        </div>
        <div className="panel detail-book">
          <div className="eyebrow">SAVE YOUR SPOT</div>
          <div className="capacity">
            <b>{e.capacity ? Math.max(0, e.capacity - e.registered) : "∞"}</b>
            <span>
              {e.capacity ? (
                <>
                  seats remaining
                  <br />
                  out of {e.capacity}
                </>
              ) : (
                <>
                  no capacity
                  <br />
                  limit
                </>
              )}
            </span>
          </div>
          <button
            disabled={registered || full}
            className="btn primary full-width"
            onClick={() => setSelected(true)}
          >
            {registered
              ? "Already registered"
              : full
                ? "Event full"
                : "Register for event"}{" "}
            {!registered && !full && <ArrowRight size={16} />}
          </button>
          <small>
            Registration details are self-reported and not verified.
          </small>
        </div>
      </div>
      {selected && (
        <RegistrationFlow
          event={e}
          close={() => setSelected(false)}
          onSuccess={d.refresh}
        />
      )}
    </>
  );
}
function RegistrationsPage(d: any) {
  const regs: Registration[] = d.regs;
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        eyebrow="YOUR CAMPUS CALENDAR"
        title="My registrations"
        subtitle="All the moments you’ve saved a seat for."
        action={
          <div className="registered-count">
            <Ticket size={16} />
            <b>{regs.length}</b> registered
          </div>
        }
      />
      <div className="reg-summary">
        <div>
          <span className="summary-icon">
            <CalendarCheck2 />
          </span>
          <div>
            <small>UPCOMING</small>
            <b>
              {
                regs.filter(
                  (r) =>
                    r.event.eventDate >= new Date().toISOString().slice(0, 10),
                ).length
              }
            </b>
          </div>
        </div>
        <div>
          <span className="summary-icon">
            <Check />
          </span>
          <div>
            <small>ALL TIME</small>
            <b>{regs.length}</b>
          </div>
        </div>
        <div className="reg-tip">
          <Sparkles />
          <span>Keep exploring — your next favorite memory is out there.</span>
          <button onClick={() => navigate("/events")}>
            Explore events <ArrowRight size={15} />
          </button>
        </div>
      </div>
      {regs.length ? (
        <div className="registration-list">
          {regs.map((r) => (
            <div className="registration-card" key={r.id}>
              <img src={r.event.imageUrl} />
              <div className="reg-info">
                <span className="category-tag">{r.event.category}</span>
                <h3>{r.event.title}</h3>
                <div className="reg-meta">
                  <span>
                    {r.reference} · {r.fullName}
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    {fmt(r.event.eventDate)} · {r.event.eventTime}
                  </span>
                  <span>
                    <MapPin size={14} />
                    {r.event.venue}
                  </span>
                </div>
              </div>
              <span
                className={`status-pill ${r.event.eventDate < new Date().toISOString().slice(0, 10) ? "past" : ""}`}
              >
                <i />
                {r.event.eventDate < new Date().toISOString().slice(0, 10)
                  ? "Attended"
                  : "Confirmed"}
              </span>
              <button
                className="cancel-btn"
                onClick={async () => {
                  if (!confirm("Cancel this registration?")) return;
                  try {
                    await api.cancel(r.id);
                    await d.refresh();
                    d.notify("Registration cancelled.");
                  } catch (x) {
                    d.notify(
                      x instanceof Error
                        ? x.message
                        : "Could not cancel registration",
                    );
                  }
                }}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="Your calendar is wide open"
          message="Register for an event and it’ll show up here."
          action={
            <button className="btn primary" onClick={() => navigate("/events")}>
              Explore events <ArrowRight size={15} />
            </button>
          }
        />
      )}
    </>
  );
}
function NoticesPage({ notices, busy }: any) {
  return (
    <>
      <PageHeading
        eyebrow="CAMPUS PULSE"
        title="Notice board"
        subtitle="The latest from across your campus community."
      />
      <div className="notice-intro">
        <div className="notice-intro-icon">
          <Bell />
        </div>
        <div>
          <b>Stay in the know.</b>
          <p>
            Important dates, campus updates, and opportunities worth catching.
          </p>
        </div>
        <span>{notices.length} UPDATES</span>
      </div>
      <div className="notice-list">
        {notices.map((n: Notice, i: number) => (
          <article className="notice-card" key={n.id}>
            <div className="notice-date">
              <b>{new Date(`${n.publishedAt}T12:00:00`).getDate()}</b>
              <small>
                {new Date(`${n.publishedAt}T12:00:00`)
                  .toLocaleDateString("en-US", { month: "short" })
                  .toUpperCase()}
              </small>
            </div>
            <div className="notice-content">
              <div className="notice-tags">
                <span className="category-tag">{n.category}</span>
                {n.priority === "Important" && (
                  <span className="important">
                    <i /> IMPORTANT
                  </span>
                )}
              </div>
              <h3>{n.title}</h3>
              <p>{n.description}</p>
              <small>Posted {fmt(n.publishedAt)}</small>
            </div>
            <div className={`notice-accent accent-${i % 4}`}>0{i + 1}</div>
          </article>
        ))}
      </div>
      {!busy && !notices.length && (
        <Empty
          title="No notices yet"
          message="New campus announcements will appear here."
        />
      )}
    </>
  );
}
function AdminPage(d: any) {
  const [edit, setEdit] = useState<Event | null>(null),
    [show, setShow] = useState(false);
  const navigate = useNavigate();
  const signOut = async () => {
    try {
      await api.logout();
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="CAMPUS OPERATIONS"
        title="Event management"
        subtitle="Keep your campus calendar fresh and inviting."
        action={
          <div className="admin-actions">
            <span className="admin-identity">
              <Shield size={14} /> {d.adminEmail}
            </span>
            <button className="btn secondary" onClick={signOut}>
              Log out
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setEdit(null);
                setShow(true);
              }}
            >
              <Plus size={17} /> Add event
            </button>
          </div>
        }
      />
      <div className="admin-note">
        <Shield size={16} />
        <span>
          <b>Administrator mode</b> — Signed in as {d.adminEmail}. Event changes
          are saved to the local database.
        </span>
      </div>
      <div className="admin-stats">
        <div>
          <span>EVENTS LISTED</span>
          <b>{d.events.length}</b>
        </div>
        <div>
          <span>TOTAL REGISTRATIONS</span>
          <b>{d.events.reduce((a: number, e: Event) => a + e.registered, 0)}</b>
        </div>
        <div>
          <span>UPCOMING</span>
          <b>
            {
              d.events.filter(
                (e: Event) =>
                  e.eventDate >= new Date().toISOString().slice(0, 10),
              ).length
            }
          </b>
        </div>
      </div>
      <div className="panel admin-table-wrap">
        <div className="table-head">
          <div>
            <div className="eyebrow">YOUR CAMPUS CALENDAR</div>
            <h3>
              All events <span>{d.events.length}</span>
            </h3>
          </div>
          <span>UPDATED JUST NOW</span>
        </div>
        <div className="admin-table">
          <div className="table-row table-label">
            <span>EVENT</span>
            <span>DATE & TIME</span>
            <span>VENUE</span>
            <span>REGISTRATIONS</span>
            <span>ACTIONS</span>
          </div>
          {d.events.map((e: Event) => (
            <div className="table-row" key={e.id}>
              <div className="table-event">
                <img src={e.imageUrl} />
                <div>
                  <b>{e.title}</b>
                  <small>{e.category}</small>
                </div>
              </div>
              <div>
                {fmt(e.eventDate)}
                <small>{e.eventTime}</small>
              </div>
              <div>{e.venue}</div>
              <div>
                {e.registered}
                {e.capacity ? ` / ${e.capacity}` : ""}
              </div>
              <div className="table-actions">
                <button
                  title="Edit"
                  onClick={() => {
                    setEdit(e);
                    setShow(true);
                  }}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  title="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete “${e.title}”?`)) return;
                    try {
                      await api.delete(e.id);
                      await d.refresh();
                      d.notify("Event deleted.");
                    } catch (x) {
                      d.notify(
                        x instanceof Error
                          ? x.message
                          : "Could not delete event",
                      );
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {show && (
        <EventModal
          event={edit}
          close={() => setShow(false)}
          save={async (v: Partial<Event>) => {
            if (edit) await api.update(edit.id, v);
            else await api.create(v);
            await d.refresh();
            setShow(false);
            d.notify(
              edit ? "Event updated." : "New event added to the calendar.",
            );
          }}
        />
      )}
    </>
  );
}
function EventModal({
  event,
  close,
  save,
}: {
  event: Event | null;
  close: () => void;
  save: (e: Partial<Event>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Event>>(
      event || {
        title: "",
        description: "",
        category: "Technical",
        eventDate: "2026-11-15",
        eventTime: "10:00",
        venue: "",
        imageUrl: "",
        capacity: 100,
      },
    ),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (k: keyof Event, v: string | number) =>
    setForm({ ...form, [k]: v });
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form
        className="modal"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.title || !form.description || !form.venue) {
            setErr("Please complete all required fields.");
            return;
          }
          setBusy(true);
          try {
            await save(form);
          } catch (x) {
            setErr(x instanceof Error ? x.message : "Could not save event");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">CAMPUS CALENDAR</div>
            <h2>{event ? "Edit event" : "Create an event"}</h2>
          </div>
          <button type="button" className="icon-btn pale" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <label>
          Event title
          <input
            value={form.title || ""}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description || ""}
            onChange={(e) => set("description", e.target.value)}
            required
            rows={3}
          />
        </label>
        <div className="form-two">
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {["Technical", "Cultural", "Sports", "Workshop", "Seminar"].map(
                (x) => (
                  <option>{x}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Venue
            <input
              value={form.venue || ""}
              onChange={(e) => set("venue", e.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-three">
          <label>
            Date
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
              required
            />
          </label>
          <label>
            Time
            <input
              type="time"
              value={form.eventTime}
              onChange={(e) => set("eventTime", e.target.value)}
              required
            />
          </label>
          <label>
            Capacity
            <input
              type="number"
              min="0"
              value={form.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Cover image URL
          <input
            value={form.imageUrl || ""}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        </label>
        {err && <div className="form-error">{err}</div>}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving..." : event ? "Save changes" : "Add event"}{" "}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
export default App;
