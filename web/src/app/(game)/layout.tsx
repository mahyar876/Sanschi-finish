import '@/styles/penalty-shell.css';

/** Full-height shell so /penalty works in iframe (class presentation). */
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <div className="game-route-shell">{children}</div>;
}
