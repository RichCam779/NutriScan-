import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuarioPageComponent } from './usuario-page';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UsuarioPageComponent', () => {
  let component: UsuarioPageComponent;
  let fixture: ComponentFixture<UsuarioPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
