export type GlossaryItem = {
  id: string;
  source: string;
  target: string;
  note?: string;
};

const GLOSSARY_KEY = 'autoTGlossary';

export async function getGlossaryItems(): Promise<GlossaryItem[]> {
  const result = await chrome.storage.local.get(GLOSSARY_KEY);
  return (result[GLOSSARY_KEY] as GlossaryItem[] | undefined) ?? [];
}

export async function addGlossaryItem(input: Omit<GlossaryItem, 'id'>) {
  const items = await getGlossaryItems();
  const item: GlossaryItem = {
    ...input,
    id: crypto.randomUUID(),
  };
  await chrome.storage.local.set({ [GLOSSARY_KEY]: [...items, item] });
}

export async function removeGlossaryItem(id: string) {
  const items = await getGlossaryItems();
  await chrome.storage.local.set({ [GLOSSARY_KEY]: items.filter((item) => item.id !== id) });
}
