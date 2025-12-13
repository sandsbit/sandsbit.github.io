import json
import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from datetime import datetime

CASES_DIR = "cases"

PROCEDURE_TYPES = [
    "Конституційне",
    "Цивільне",
    "Господарське",
    "Адміністративне",
    "Справи про адміністративні правопорушення",
    "Кримінальне",
]

STATUSES = [
    "Подано",
    "Розглядається",
    "Апеляційне провадження",
    "Касаційне провадження",
    "Повторно розглядається",
    "Вирішення окремих питань",
    "Розглянуто",
    "Набрало законної сили, виконанню не підлягає",
    "Виконується",
    "Виконано",
    "Відмовлено в розгляді або справу відкликано",
]


# ---------- utils ----------

def ensure_cases_dir():
    os.makedirs(CASES_DIR, exist_ok=True)


def next_case_id():
    ids = []
    for f in os.listdir(CASES_DIR):
        if f.endswith(".json"):
            try:
                ids.append(int(f[:-5]))
            except ValueError:
                pass
    return max(ids, default=0) + 1


def validate_date(value):
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


# ---------- generic list editor ----------

class ListEditor(tk.Frame):
    def __init__(self, master, columns):
        super().__init__(master)
        self.columns = columns

        self.tree = ttk.Treeview(self, columns=columns, show="headings", height=5)
        for c in columns:
            self.tree.heading(c, text=c)
            self.tree.column(c, width=180)
        self.tree.pack(fill=tk.BOTH, expand=True)

        btns = ttk.Frame(self)
        btns.pack(fill=tk.X, pady=4)

        ttk.Button(btns, text="Додати", command=self.add).pack(side=tk.LEFT)
        ttk.Button(btns, text="Редагувати", command=self.edit).pack(side=tk.LEFT)
        ttk.Button(btns, text="Видалити", command=self.remove).pack(side=tk.LEFT)

    def add(self):
        self._edit_item()

    def edit(self):
        sel = self.tree.selection()
        if sel:
            self._edit_item(sel[0])

    def remove(self):
        for i in self.tree.selection():
            self.tree.delete(i)

    def _edit_item(self, item=None):
        dlg = tk.Toplevel(self)
        dlg.grab_set()

        entries = {}
        for i, col in enumerate(self.columns):
            ttk.Label(dlg, text=col).grid(row=i, column=0, sticky="w")
            e = ttk.Entry(dlg, width=40)
            e.grid(row=i, column=1)
            entries[col] = e

        if item:
            for col, val in zip(self.columns, self.tree.item(item, "values")):
                entries[col].insert(0, val)

        def save():
            values = [entries[c].get() for c in self.columns]
            if item:
                self.tree.item(item, values=values)
            else:
                self.tree.insert("", "end", values=values)
            dlg.destroy()

        ttk.Button(dlg, text="Зберегти", command=save).grid(
            row=len(self.columns), column=0, columnspan=2
        )

    def get_data(self):
        return [
            dict(zip(self.columns, self.tree.item(i, "values")))
            for i in self.tree.get_children()
        ]

    def set_data(self, data):
        self.tree.delete(*self.tree.get_children())
        for d in data:
            self.tree.insert("", "end", values=[d[c] for c in self.columns])


# ---------- court composition editor ----------

class CourtCompositionEditor(tk.Frame):
    def __init__(self, master):
        super().__init__(master)
        self.instances = []

        self.tree = ttk.Treeview(self, columns=["instance"], show="headings", height=4)
        self.tree.heading("instance", text="Інстанція")
        self.tree.pack(fill=tk.BOTH, expand=True)

        btns = ttk.Frame(self)
        btns.pack(fill=tk.X)

        ttk.Button(btns, text="Додати", command=self.add).pack(side=tk.LEFT)
        ttk.Button(btns, text="Редагувати", command=self.edit).pack(side=tk.LEFT)
        ttk.Button(btns, text="Видалити", command=self.remove).pack(side=tk.LEFT)

    def add(self):
        self._edit_instance()

    def edit(self):
        sel = self.tree.selection()
        if sel:
            self._edit_instance(int(sel[0]))

    def remove(self):
        for sel in self.tree.selection():
            del self.instances[int(sel)]
        self.refresh()

    def _edit_instance(self, idx=None):
        dlg = tk.Toplevel(self)
        dlg.grab_set()

        ttk.Label(dlg, text="Інстанція").pack(anchor="w")
        instance_entry = ttk.Entry(dlg, width=40)
        instance_entry.pack(fill=tk.X)

        judges = ListEditor(dlg, ["name", "status"])
        judges.pack(fill=tk.BOTH, expand=True)

        if idx is not None:
            instance_entry.insert(0, self.instances[idx]["instance"])
            judges.set_data(self.instances[idx]["panel"])

        def save():
            entry = {
                "instance": instance_entry.get(),
                "panel": judges.get_data()
            }
            if idx is not None:
                self.instances[idx] = entry
            else:
                self.instances.append(entry)
            self.refresh()
            dlg.destroy()

        ttk.Button(dlg, text="Зберегти", command=save).pack()

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        for i, inst in enumerate(self.instances):
            self.tree.insert("", "end", iid=str(i), values=[inst["instance"]])

    def get_data(self):
        return self.instances

    def set_data(self, data):
        self.instances = data or []
        self.refresh()


# ---------- main editor ----------

class CaseEditor(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Редактор судових справ")
        self.geometry("900x900")

        ensure_cases_dir()
        self.case_id = None

        canvas = tk.Canvas(self)
        scrollbar = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        frame = ttk.Frame(canvas)

        frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.fields = {}

        def add_field(label):
            ttk.Label(frame, text=label).pack(anchor="w")
            e = ttk.Entry(frame, width=80)
            e.pack(fill=tk.X)
            self.fields[label] = e

        add_field("Назва")
        add_field("Номер справи")
        add_field("Тип провадження першої інстанції")
        add_field("Дата подання (YYYY-MM-DD)")
        add_field("Поточний суд")
        add_field("Ціна позову")

        ttk.Label(frame, text="Опис позову").pack(anchor="w")
        self.claim_description = tk.Text(frame, height=5, width=80)
        self.claim_description.pack(fill=tk.BOTH)

        ttk.Label(frame, text="Судочинство").pack(anchor="w")
        self.procedure = ttk.Combobox(frame, values=PROCEDURE_TYPES)
        self.procedure.pack(fill=tk.X)

        ttk.Label(frame, text="Стан").pack(anchor="w")
        self.status = ttk.Combobox(frame, values=STATUSES)
        self.status.pack(fill=tk.X)

        ttk.Label(frame, text="Інші суди").pack(anchor="w")
        self.other_courts = ListEditor(frame, ["court"])
        self.other_courts.pack(fill=tk.BOTH)

        ttk.Label(frame, text="Сторони та треті особи").pack(anchor="w")
        self.parties = ListEditor(frame, ["status", "name"])
        self.parties.pack(fill=tk.BOTH)

        ttk.Label(frame, text="Провадження").pack(anchor="w")
        self.proceedings = ListEditor(frame, ["number", "comment"])
        self.proceedings.pack(fill=tk.BOTH)

        ttk.Label(frame, text="Позовні вимоги").pack(anchor="w")
        self.claims = ListEditor(frame, ["claim"])
        self.claims.pack(fill=tk.BOTH)

        ttk.Label(frame, text="Хід справи").pack(anchor="w")
        self.history = ListEditor(frame, ["date", "event"])
        self.history.pack(fill=tk.BOTH)

        ttk.Label(frame, text="Склад суду").pack(anchor="w")
        self.court_composition = CourtCompositionEditor(frame)
        self.court_composition.pack(fill=tk.BOTH)

        btns = ttk.Frame(frame)
        btns.pack(pady=10)

        ttk.Button(btns, text="Новa справа", command=self.new_case).pack(side=tk.LEFT)
        ttk.Button(btns, text="Відкрити", command=self.load_case).pack(side=tk.LEFT)
        ttk.Button(btns, text="Зберегти", command=self.save_case).pack(side=tk.LEFT)

    # ---------- actions ----------

    def new_case(self):
        self.case_id = None
        for f in self.fields.values():
            f.delete(0, tk.END)
        self.procedure.set("")
        self.status.set("")
        for editor in [
            self.other_courts, self.parties, self.proceedings,
            self.claims, self.history
        ]:
            editor.set_data([])
        self.court_composition.set_data([])

    def save_case(self):
        if not validate_date(self.fields["Дата подання (YYYY-MM-DD)"].get()):
            messagebox.showerror("Помилка", "Невірний формат дати")
            return

        data = {
            "title": self.fields["Назва"].get(),
            "case_number": self.fields["Номер справи"].get(),
            "first_instance_type": self.fields["Тип провадження першої інстанції"].get(),
            "submission_date": self.fields["Дата подання (YYYY-MM-DD)"].get(),
            "current_court": self.fields["Поточний суд"].get(),
            "claim_price": int(self.fields["Ціна позову"].get() or 0),
            "procedure": self.procedure.get(),
            "status": self.status.get(),
            "other_courts": [c["court"] for c in self.other_courts.get_data()],
            "parties": self.parties.get_data(),
            "proceedings": self.proceedings.get_data(),
            "claims": [c["claim"] for c in self.claims.get_data()],
            "history": self.history.get_data(),
            "court_composition": self.court_composition.get_data(),
            "claim_description": self.claim_description.get("1.0", tk.END).strip()
        }

        if self.case_id is None:
            self.case_id = next_case_id()

        path = os.path.join(CASES_DIR, f"{self.case_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        messagebox.showinfo("Готово", f"Збережено як {self.case_id}.json")

    def load_case(self):
        path = filedialog.askopenfilename(
            initialdir=CASES_DIR, filetypes=[("JSON", "*.json")]
        )
        if not path:
            return

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.case_id = int(os.path.basename(path)[:-5])

        self.fields["Назва"].delete(0, tk.END)
        self.fields["Назва"].insert(0, data.get("title", ""))

        self.fields["Номер справи"].delete(0, tk.END)
        self.fields["Номер справи"].insert(0, data.get("case_number", ""))

        self.fields["Тип провадження першої інстанції"].delete(0, tk.END)
        self.fields["Тип провадження першої інстанції"].insert(0, data.get("first_instance_type", ""))

        self.fields["Дата подання (YYYY-MM-DD)"].delete(0, tk.END)
        self.fields["Дата подання (YYYY-MM-DD)"].insert(0, data.get("submission_date", ""))

        self.fields["Поточний суд"].delete(0, tk.END)
        self.fields["Поточний суд"].insert(0, data.get("current_court", ""))

        self.fields["Ціна позову"].delete(0, tk.END)
        self.fields["Ціна позову"].insert(0, data.get("claim_price", ""))

        self.claim_description.delete("1.0", tk.END)
        self.claim_description.insert("1.0", data.get("claim_description", ""))

        self.procedure.set(data.get("procedure", ""))
        self.status.set(data.get("status", ""))

        self.other_courts.set_data([{"court": c} for c in data.get("other_courts", [])])
        self.parties.set_data(data.get("parties", []))
        self.proceedings.set_data(data.get("proceedings", []))
        self.claims.set_data([{"claim": c} for c in data.get("claims", [])])
        self.history.set_data(data.get("history", []))
        self.court_composition.set_data(data.get("court_composition", []))


if __name__ == "__main__":
    CaseEditor().mainloop()
