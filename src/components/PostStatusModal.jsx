import Icon from './Icon';
import './PostStatusModal.css';

function PostStatusModal({ status, title, message, onClose }) {
  if (!status) return null;

  return (
    <div className="post-status-overlay">
      <div className={`post-status-box status-${status}`}>
        <div className="post-status-icon-wrap">
          <Icon name={status === 'success' ? 'checkCircle' : 'alertTriangle'} size={32} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <button className="post-status-close-btn" onClick={onClose}>รับทราบ</button>
      </div>
    </div>
  );
}

export default PostStatusModal;
