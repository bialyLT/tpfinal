
const Loading = ({ message = 'Cargando...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100">
      <div className="flex items-center gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="text-lg text-base-content">{message}</span>
      </div>
    </div>
  );
};

export default Loading;
