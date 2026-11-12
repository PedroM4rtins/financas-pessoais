import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const ToastContext = createContext<(message: string) => void>(() => undefined);

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((text: string) => {
    setMessage(text);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-20 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[11px] bg-sidebar px-[18px] py-3 font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,.2)] transition-all duration-200 motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-[30px] opacity-0'
        }`}
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
