type LoadingStateProps = {
  message?: string;
};

const LoadingState = ({ message = 'Завантаження...' }: LoadingStateProps) => (
  <div className="empty-state">
    <p>{message}</p>
  </div>
);

export default LoadingState;

