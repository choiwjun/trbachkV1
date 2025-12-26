import React from 'react';
import { Modal, Button, Card } from './ui/LayoutComponents';

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const WarningModal: React.FC<WarningModalProps> = ({ isOpen, onClose, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Card className="border-orange-500/30 bg-zinc-900 p-8">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <i className="ri-alert-fill text-3xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">합산과세 주의</h3>
            <p className="text-zinc-400 text-base leading-relaxed">
              {message || "총 구매 금액이 $150를 초과하여 관부가세가 부과될 수 있습니다. 이는 수익률에 큰 영향을 미칩니다."}
            </p>
          </div>
          <Button variant="secondary" onClick={onClose} className="mt-2 h-14 text-base">
            확인했습니다
          </Button>
        </div>
      </Card>
    </Modal>
  );
};