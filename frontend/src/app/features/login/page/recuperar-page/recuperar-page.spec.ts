import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecuperarPageComponent } from './recuperar-page';
import { provideRouter } from '@angular/router';

describe('RecuperarPageComponent', () => {
  let component: RecuperarPageComponent;
  let fixture: ComponentFixture<RecuperarPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarPageComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
