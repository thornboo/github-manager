import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import type { SortDirection, SortOption } from "@/types/ui";

interface StarsFilterProps {
  language: string | null;
  onLanguageChange: (value: string | null) => void;
  languages: string[];
  sortField: SortOption;
  sortDirection: SortDirection;
  onSortChange: (field: SortOption, direction: SortDirection) => void;
}

const SORT_OPTIONS: Array<{
  value: string;
  label: string;
  field: SortOption;
  direction: SortDirection;
}> = [
  {
    value: "starred-desc",
    label: "最近收藏",
    field: "starred",
    direction: "desc",
  },
  {
    value: "starred-asc",
    label: "最早收藏",
    field: "starred",
    direction: "asc",
  },
  {
    value: "stars-desc",
    label: "Stars 最多",
    field: "stars",
    direction: "desc",
  },
  { value: "stars-asc", label: "Stars 最少", field: "stars", direction: "asc" },
  {
    value: "updated-desc",
    label: "最近更新",
    field: "updated",
    direction: "desc",
  },
  {
    value: "updated-asc",
    label: "最早更新",
    field: "updated",
    direction: "asc",
  },
  { value: "name-asc", label: "名称 A-Z", field: "name", direction: "asc" },
  { value: "name-desc", label: "名称 Z-A", field: "name", direction: "desc" },
  {
    value: "forks-desc",
    label: "Forks 最多",
    field: "forks",
    direction: "desc",
  },
];

export function StarsFilter({
  language,
  onLanguageChange,
  languages,
  sortField,
  sortDirection,
  onSortChange,
}: StarsFilterProps) {
  const currentSortValue = `${sortField}-${sortDirection}`;

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find((opt) => opt.value === value);
    if (option) {
      onSortChange(option.field, option.direction);
    }
  };

  return (
    <>
      <Select
        value={language || "all"}
        onValueChange={(value) =>
          onLanguageChange(value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="全部语言" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部语言</SelectItem>
          {languages.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSortValue} onValueChange={handleSortChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
