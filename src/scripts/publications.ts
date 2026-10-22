export function initPublicationFilters() {
  const root=document.querySelector<HTMLElement>('[data-publications]');
  if(!root)return;
  root.querySelector('form')?.addEventListener('submit',event=>event.preventDefault());
  const year=root.querySelector<HTMLSelectElement>('#publication-year')!;
  const category=root.querySelector<HTMLSelectElement>('#publication-category')!;
  const search=root.querySelector<HTMLInputElement>('#publication-search')!;
  const rows=Array.from(root.querySelectorAll<HTMLElement>('.publication'));
  const more=root.querySelector<HTMLButtonElement>('#publication-more')!;
  const count=root.querySelector<HTMLElement>('#publication-count')!;
  const empty=root.querySelector<HTMLElement>('#publication-empty')!;
  let limit=40;
  const categoryHash=decodeURIComponent(location.hash.slice(1));
  if(Array.from(category.options).some(x=>x.value===categoryHash))category.value=categoryHash;
  function update(reset=true){
    if(reset)limit=40;
    const q=search.value.trim().toLocaleLowerCase();
    const matches=rows.filter(row=>(!year.value||row.dataset.year===year.value)&&(!category.value||row.dataset.category===category.value)&&(!q||row.dataset.search?.includes(q)));
    rows.forEach(row=>{row.hidden=true;});
    matches.slice(0,limit).forEach(row=>{row.hidden=false;});
    const visible=Math.min(limit,matches.length);
    count.textContent=root!.dataset.lang==='ja'?`${matches.length}件中 ${visible}件を表示`:`Showing ${visible} of ${matches.length} publications`;
    more.hidden=visible>=matches.length;
    empty.hidden=matches.length!==0;
  }
  year.addEventListener('change',()=>update());
  category.addEventListener('change',()=>update());
  search.addEventListener('input',()=>update());
  more.addEventListener('click',()=>{limit+=40;update(false);});
  update();
}
