type ErrorStateProps = {
  message: string;
  retry?: () => void;
};

const ErrorState = ({ message, retry }: ErrorStateProps) => (
  <div className="empty-state">
    <p>{message}</p>
    {retry && (
      <button type="button" className="primary-button" onClick={retry}>
        Спробувати ще раз
      </button>
    )}
  </div>
);

export default ErrorState;

