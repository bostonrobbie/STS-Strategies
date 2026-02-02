import { StrategyForm } from "@/components/admin/strategy-form";

export const metadata = {
  title: "New Strategy | Admin | STS Strategies",
};

export default function NewStrategyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create New Strategy</h1>
        <p className="text-muted-foreground mt-1">
          Add a new trading strategy to your platform
        </p>
      </div>

      <StrategyForm />
    </div>
  );
}
