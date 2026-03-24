import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <AlertCircle className="w-16 h-16 text-muted-foreground mb-6 opacity-50" />
      <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-xs">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        href="/" 
        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-md"
      >
        Back to Timeline
      </Link>
    </div>
  );
}
