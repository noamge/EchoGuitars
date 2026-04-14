import styles from './VolunteerLayout.module.css';

export default function VolunteerLayout({ children, onLogout }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <span>🎸</span>
          <span>EchoGuitars</span>
          <span className={styles.badge}>מתנדב</span>
        </div>
        <button className={styles.logoutBtn} onClick={onLogout}>
          יציאה
        </button>
      </header>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
