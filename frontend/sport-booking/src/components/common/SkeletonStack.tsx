type SkeletonStackProps = {
  count?: number;
};

const SkeletonStack = ({ count = 3 }: SkeletonStackProps) => (
  <div className="sections-grid">
    {Array.from({ length: count }).map((_, idx) => (
      <div className="skeleton" key={`skeleton-${idx}`} />
    ))}
  </div>
);

export default SkeletonStack;

