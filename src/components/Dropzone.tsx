import { useRef, useState } from 'react';

type Props = { onFiles: (files: File[]) => void };

export function Dropzone({ onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHover(false);
        onFiles([...event.dataTransfer.files]);
      }}
      className={`block w-full cursor-pointer rounded-card border-2 border-dashed p-11 text-center transition ${
        hover ? 'border-accent' : ''
      } bg-accent-soft hover:border-accent`}
      style={hover ? undefined : { borderColor: 'rgb(var(--c-drop-line))' }}
    >
      <div className="text-4xl">📄</div>
      <b className="mb-1 mt-2 block text-base">Solte seus arquivos aqui ou clique para escolher</b>
      <span className="text-muted">
        PDF ou CSV · Inter · Nubank · Itaú · Bradesco · C6 · Mercado Pago · genérico
      </span>
      <input
        ref={input}
        type="file"
        accept=".pdf,.csv"
        multiple
        hidden
        aria-label="Escolher arquivos"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </button>
  );
}
