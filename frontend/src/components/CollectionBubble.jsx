import styles from './CollectionBubble.module.css';

export default function CollectionBubble({ collection, onClick }) {
  if (!collection || collection.guitars.length === 0) return null;
  const activeCount = collection.guitars.filter(g =>
    g.status === 'selected' || g.status === 'pending'
  ).length;

  return (
    <button className={styles.bubble} onClick={onClick} title="פתח רשימת איסוף">
      <span className={styles.bubbleIcon}>🎸</span>
      {activeCount > 0 && <span className={styles.bubbleBadge}>{activeCount}</span>}
      <span className={styles.bubbleLabel}>רשימת איסוף</span>
    </button>
  );
}
