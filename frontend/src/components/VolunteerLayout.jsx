import styles from './VolunteerLayout.module.css';

export default function VolunteerLayout({ children, onLogout, volunteerName }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎸</span>
          <span className={styles.logoText}>EchoGuitars</span>
        </div>
        <div className={styles.right}>
          {volunteerName && (
            <span className={styles.greeting}>שלום, {volunteerName}</span>
          )}
          <button className={styles.logoutBtn} onClick={onLogout}>
            יציאה
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
