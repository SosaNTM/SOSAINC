interface PlaceholderPageProps {
  name: string;
}

const PlaceholderPage = ({ name }: PlaceholderPageProps) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-card p-12 text-center max-w-md">
        <h2 className="text-2xl font-extrabold text-foreground mb-2">{name}</h2>
        <p className="text-muted-foreground font-semibold">Section {name} coming soon</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
