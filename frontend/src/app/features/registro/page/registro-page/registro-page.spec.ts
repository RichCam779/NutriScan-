import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroPageComponent } from './registro-page';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegistroPageComponent', () => {
  let component: RegistroPageComponent;
  let fixture: ComponentFixture<RegistroPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroPageComponent],
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

    fixture = TestBed.createComponent(RegistroPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
