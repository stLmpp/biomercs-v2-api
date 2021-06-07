import { BadRequestException, Injectable, PreconditionFailedException } from '@nestjs/common';
import { AuthConfirmationRepository } from './auth-confirmation.repository';
import { AuthConfirmationAddDto } from './auth-confirmation.dto';
import { AuthConfirmation } from './auth-confirmation.entity';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import { addDays, addHours, isBefore } from 'date-fns';
import { random } from '../../util/util';
import { User } from '../../user/user.entity';

@Injectable()
export class AuthConfirmationService {
  constructor(private authConfirmationRepository: AuthConfirmationRepository) {}

  async add(dto: AuthConfirmationAddDto): Promise<AuthConfirmation> {
    const exists = await this.authConfirmationRepository.exists({
      idUser: dto.idUser,
      expirationDate: MoreThanOrEqual(new Date()),
      confirmationDate: IsNull(),
    });
    if (exists) {
      throw new BadRequestException('User already waiting for confirmation!');
    }
    return this.authConfirmationRepository.save(new AuthConfirmation().extendDto(dto));
  }

  async invalidateCode(idAuthConfirmation: number): Promise<void> {
    await this.authConfirmationRepository.update(idAuthConfirmation, { expirationDate: addHours(new Date(), -1) });
  }

  async confirmCode(idAuthConfirmation: number, code: number): Promise<void> {
    const authConfirmation = await this.authConfirmationRepository.findOneOrFail(idAuthConfirmation);
    if (authConfirmation.code !== code) {
      throw new BadRequestException('Wrong code');
    }
    if (isBefore(authConfirmation.expirationDate, new Date())) {
      throw new BadRequestException('Confirmation code expired');
    }
    await this.authConfirmationRepository.update(idAuthConfirmation, { confirmationDate: new Date() });
  }

  async generateConfirmationCode(user: User): Promise<AuthConfirmation> {
    if (user.idCurrentAuthConfirmation) {
      throw new PreconditionFailedException({ message: 'User waiting for confirmation', extra: user.id });
    }
    const code = random(100000, 999999);
    return await this.add({ idUser: user.id, code, expirationDate: addDays(new Date(), 1) });
  }
}
